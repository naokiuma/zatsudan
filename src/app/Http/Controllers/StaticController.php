<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Theme;
use App\Models\Comment;
use Carbon\Carbon;
use Inertia\Inertia;

class StaticController extends Controller
{
	public function about(Request $request)
	{
		// Aboutページ表示 Inertiaではなく、bladeで。
		return view('static.about');
	}
}
