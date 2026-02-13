<?php

use App\Http\Controllers\TopController;
use App\Http\Controllers\StaticController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [TopController::class, 'index'])->name('top');
Route::get('/canvas', [TopController::class, 'canvas'])->name('canvas');

Route::get('/about', [StaticController::class, 'about'])->name('about');

// TODO: MVP用に認証なし。本番では auth middleware を追加すること
// doing / comment API
Route::post('/api/doing/switch', [TopController::class, 'switchDoing'])->name('doing.switch');
Route::post('/api/doing/comment', [TopController::class, 'storeDoingComment'])->name('doing.comment');
Route::post('/api/topic/comment', [TopController::class, 'storeTopicComment'])->name('topic.comment');

Route::middleware('auth')->group(function () {
	// profile
	Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
	Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
	Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::get('/dashboard', function () {
	return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

require __DIR__ . '/auth.php';
