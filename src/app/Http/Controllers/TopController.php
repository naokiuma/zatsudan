<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Theme;
use App\Models\Comment;
use Carbon\Carbon;
use Inertia\Inertia;

class TopController extends Controller
{
	public function index(Request $request)
	{
		// ?day=20260104 があればそれを使う
		$dayParam = $request->query('day');

		if ($dayParam) {
			// YYYYMMDD を想定
			$targetDayJst = Carbon::createFromFormat(
				'Ymd',
				$dayParam,
				'Asia/Tokyo'
			);
		} else {
			$targetDayJst = Carbon::now('Asia/Tokyo');
		}

		$todayFormatted = $targetDayJst->format('Y年m月d日');

		// JSTの開始・終了 → UTC
		$startUtc = $targetDayJst->copy()->startOfDay()->utc();
		$endUtc   = $targetDayJst->copy()->endOfDay()->utc();

		$todayTheme = Theme::whereBetween('created_at', [$startUtc, $endUtc])
			->latest('created_at')
			->first();

		$comments = [];
		if ($todayTheme) {
			// var_dump('テーマID:' . $todayTheme->id);
			// exit;
			$comments = Comment::where('theme_id', $todayTheme->id)
				->latest('created_at')
				->get();
		}
		// var_dump(($comments)->toArray());

		return Inertia::render('Top', [
			'todayTheme' => $todayTheme,
			'comments' => $comments,
			'todayFormatted' => $todayFormatted,
			'day' => $targetDayJst->format('Ymd'),
		]);
	}


	// コメント保存
	public function store(Request $request)
	{
		$data = $request->validate([
			'day' => ['required', 'date_format:Ymd'],
			'name' => ['nullable', 'string', 'max:30'],
			'body' => ['required', 'string', 'max:200'],
			'gender' => ['required', 'in:unknown,male,female,other'],
			'age_range' => ['required', 'in:10s,20s,30s,40s,50s,60s+'],
			'avatar_id' => ['nullable', 'integer', 'min:1', 'max:100'],
		]);


		// YYYYMMDD → JST の日付
		$targetDayJst = Carbon::createFromFormat(
			'Ymd',
			$data['day'],
			'Asia/Tokyo'
		);

		// JST の開始・終了 → UTC
		$startUtc = $targetDayJst->copy()->startOfDay()->utc();
		$endUtc   = $targetDayJst->copy()->endOfDay()->utc();


		// var_dump($startUtc->toDateTimeString()); // "2026-01-06 15:00:00"
		// var_dump($endUtc->toDateTimeString());   // "2026-01-07 14:59:59"
		// exit;

		// string(19) "2026-01-06 15:00:00" string(19) "2026-01-07 14:59:59" 

		// その日の Theme を取得（index と完全に同じ条件）
		$theme = Theme::whereBetween('created_at', [$startUtc, $endUtc])
			->latest('created_at')
			->first();

		// 万が一 Theme がない場合
		if (!$theme) {
			return redirect()
				->route('top', ['day' => $data['day']])
				->with('error', '今日のお題が見つかりませんでした');
		}

		// Comment 保存
		Comment::create([
			'theme_id'  => $theme->id,
			'user_id'   => null, // 将来ログイン対応するならここに auth()->id()
			'name'      => $data['name'] ?: '匿名',
			'body'      => $data['body'],
			'gender'    => $data['gender'],
			'age_range' => $data['age_range'],
			'avatar_id' => $data['avatar_id'] ?? null,
		]);

		// 同じ日付の Top に戻す（→ index が再実行される）
		return redirect()->route('top', [
			'day' => $data['day'],
		]);
	}
}
