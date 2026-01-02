<?php

namespace App\Http\Controllers;

use App\Models\Theme;
use Carbon\Carbon;
use Inertia\Inertia;

class TopController extends Controller
{
	public function index()
	{
		$todayJst = Carbon::now('Asia/Tokyo');
		//日本時間としてxx年xx月xx日と表示する
		$todayFormatted = $todayJst->format('Y年m月d日');


		// 日本時間の今日の開始・終了を UTC に変換
		$startUtc = $todayJst->copy()->startOfDay()->utc();
		$endUtc   = $todayJst->copy()->endOfDay()->utc();

		// 今日のテーマを取得
		$todayTheme = Theme::whereBetween('created_at', [$startUtc, $endUtc])
			->latest('created_at')
			->first(); // なければ null

		// var_dump($todayTheme); // デバッグ用
		// exit;

		return Inertia::render('Top', [
			'todayTheme' => $todayTheme, // まずはモック
			'comments' => [],
			'todayFormatted' => $todayFormatted,
		]);
	}
}
