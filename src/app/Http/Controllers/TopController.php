<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Room;
use App\Models\Doing;
use App\Models\Topic;
use App\Models\Comment;
use App\Models\TopicComment;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TopController extends Controller
{
	/**
	 * 現在のユーザーIDを取得（MVP開発用メソッド）
	 * 
	 * MVP開発中: ログインなし/ありを柔軟に切り替えられる
	 * 本番（認証必須後）: このメソッドは不要。コントローラーで直接 Auth::id() を使う
	 */
	private function getCurrentUserId(): ?int
	{
		// パターンA: user1固定（MVP用 - ログインなしでもコメント可能）
		return Auth::id() ?? 2;
		//各ユーザーの作業は1日おごとに異なる。各ユーザーが自分でdoingを切り替えれば正しく反映されます。

		// パターンB: ゲストモード（開発中の動作確認用 - ログインなしはコメント不可）
		// return Auth::id();
	}

	public function index(Request $request)
	{
		$dayParam = $request->query('day');

		if ($dayParam) {
			$targetDayJst = Carbon::createFromFormat('Ymd', $dayParam, 'Asia/Tokyo');
		} else {
			$targetDayJst = Carbon::now('Asia/Tokyo');
		}

		$todayFormatted = $targetDayJst->format('Y年m月d日');
		$today = $targetDayJst->toDateString();

		$room = Room::where('slug', 'main')->where('is_active', true)->first();

		// doing_types (config)
		$doingTypes = collect(config('doing_types'))
			->sortBy('sort_order')
			->map(fn($dt) => [
				'key' => $dt['key'],
				'label' => $dt['label'],
				'emoji' => $dt['emoji'],
				'color' => $dt['color'],
				'moveChance' => (float) $dt['move_chance'],
				'moveDistance' => (int) $dt['move_distance'],
				'cssAnim' => $dt['css_anim'],
			])
			->values();

		// topics — 今日分（全件返す。フロントでローテーション）
		$topics = $room
			? Topic::where('room_id', $room->id)
			->where('is_active', true)
			->orderBy('starts_at')
			->get()
			->map(fn($t) => [
				'id' => $t->id,
				'title' => $t->title,
				'desc' => $t->description,
			])
			->values()
			: collect();

		// users
		$users = \App\Models\User::select('id', 'name')
			->orderBy('id')
			->get()
			->map(fn($u) => ['id' => $u->id, 'name' => $u->name])
			->values();

		// currentUserId
		// MVP開発中: getCurrentUserId() でゲスト/ユーザーモード切り替え可能
		$currentUserId = $this->getCurrentUserId();
		// 本番（認証必須後）: 直接 Auth::id() を使う方がシンプル
		// $currentUserId = Auth::id();

		// doings — 今日分（user_doings相当）
		$doings = $room
			? Doing::where('room_id', $room->id)
			->where('day', $today)
			->orderBy('started_at', 'desc')
			->get()
			->map(fn($d) => [
				'id' => $d->id,
				'user_id' => $d->user_id,
				'doing_key' => $d->doing_type_key,
				'started_at' => $d->started_at->getTimestampMs(),
				'is_current' => $d->is_current,
			])
			->values()
			: collect();

		// doingComments — doing紐付きコメント（今日分）
		$doingComments = $room
			? Comment::where('room_id', $room->id)
			->where('day', $today)
			->whereNotNull('doing_id')
			->orderBy('created_at')
			->get()
			->map(fn($c) => [
				'id' => $c->id,
				'doing_id' => $c->doing_id,
				'author_user_id' => $c->user_id,
				'text' => $c->content,
				'created_at' => $c->created_at->getTimestampMs(),
			])
			->values()
			: collect();

		// topicComments — topic_comments 経由
		$topicComments = $room
			? TopicComment::whereHas('topic', fn($q) => $q->where('room_id', $room->id))
			->with('comment')
			->get()
			->map(fn($tc) => [
				'id' => $tc->comment->id,
				'topic_id' => $tc->topic_id,
				'author_user_id' => $tc->comment->user_id,
				'text' => $tc->comment->content,
				'created_at' => $tc->comment->created_at->getTimestampMs(),
			])
			->values()
			: collect();

		return Inertia::render('Top', [
			'todayFormatted' => $todayFormatted,
			'day' => $targetDayJst->format('Ymd'),
			'doingTypes' => $doingTypes,
			'topics' => $topics,
			'users' => $users,
			'currentUserId' => $currentUserId,
			'doings' => $doings,
			'doingComments' => $doingComments,
			'topicComments' => $topicComments,
			'roomId' => $room?->id,
		]);
	}

	// public function canvas(Request $request)
	// {
	// 	return Inertia::render('Canvas', []);
	// }

	/**
	 * doing 切り替え
	 */
	public function switchDoing(Request $request)
	{
		$data = $request->validate([
			'doing_type_key' => ['required', 'string', 'max:64'],
		]);

		$userId = $this->getCurrentUserId();
		$room = Room::where('slug', 'main')->where('is_active', true)->firstOrFail();
		$today = Carbon::now('Asia/Tokyo')->toDateString();

		$key = $data['doing_type_key'];
		$doingType = config("doing_types.{$key}");
		abort_unless($doingType, 404, 'Unknown doing type');

		// 現在の doing を終了
		Doing::where('user_id', $userId)
			->where('room_id', $room->id)
			->where('day', $today)
			->where('is_current', true)
			->update([
				'is_current' => false,
				'ended_at' => Carbon::now(),
			]);

		// 新しい doing を作成
		$doing = Doing::create([
			'user_id' => $userId,
			'room_id' => $room->id,
			'doing_type_key' => $key,
			'day' => $today,
			'started_at' => Carbon::now(),
			'is_current' => true,
		]);

		return response()->json([
			'id' => $doing->id,
			'user_id' => $doing->user_id,
			'doing_key' => $key,
			'started_at' => $doing->started_at->getTimestampMs(),
			'is_current' => true,
		]);
	}

	/**
	 * doing へのコメント投稿
	 */
	public function storeDoingComment(Request $request)
	{
		$data = $request->validate([
			'doing_id' => ['required', 'integer', 'exists:doings,id'],
			'content' => ['required', 'string', 'max:500'],
		]);

		$userId = $this->getCurrentUserId();
		$doing = Doing::findOrFail($data['doing_id']);

		$comment = Comment::create([
			'room_id' => $doing->room_id,
			'user_id' => $userId,
			'day' => $doing->day,
			'doing_id' => $doing->id,
			'content' => $data['content'],
		]);

		return response()->json([
			'id' => $comment->id,
			'doing_id' => $comment->doing_id,
			'author_user_id' => $comment->user_id,
			'text' => $comment->content,
			'created_at' => $comment->created_at->getTimestampMs(),
		]);
	}

	/**
	 * topic へのコメント投稿
	 */
	public function storeTopicComment(Request $request)
	{
		$data = $request->validate([
			'topic_id' => ['required', 'integer', 'exists:topics,id'],
			'content' => ['required', 'string', 'max:500'],
		]);

		$userId = $this->getCurrentUserId();
		$topic = Topic::findOrFail($data['topic_id']);

		$comment = Comment::create([
			'room_id' => $topic->room_id,
			'user_id' => $userId,
			'day' => Carbon::now('Asia/Tokyo')->toDateString(),
			'content' => $data['content'],
		]);

		TopicComment::create([
			'topic_id' => $topic->id,
			'comment_id' => $comment->id,
		]);

		return response()->json([
			'id' => $comment->id,
			'topic_id' => $topic->id,
			'author_user_id' => $comment->user_id,
			'text' => $comment->content,
			'created_at' => $comment->created_at->getTimestampMs(),
		]);
	}
}
