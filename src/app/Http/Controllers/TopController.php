<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use App\Models\Theme;
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

    return Inertia::render('Top', [
        'todayTheme' => $todayTheme,
        'comments' => [],
        'todayFormatted' => $todayFormatted,
        'day' => $targetDayJst->format('Ymd'),
    ]);
}
}
