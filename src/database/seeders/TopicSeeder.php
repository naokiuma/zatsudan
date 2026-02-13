<?php

namespace Database\Seeders;

use App\Models\Room;
use App\Models\Topic;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class TopicSeeder extends Seeder
{
    public function run(): void
    {
        $room = Room::where('slug', 'main')->first();

        $topics = [
            ['title' => 'いま飲んでるものは？',       'description' => '水でもコーヒーでも☺️'],
            ['title' => '今日いちばん進んだことは？',   'description' => '小さくてもOK！'],
            ['title' => '最近ハマってる作業BGMは？',    'description' => '音なしでも可！'],
            ['title' => 'いまの気分を絵文字1つで！',    'description' => '🙂😇😪🥺🔥 など'],
            ['title' => '今日のごほうび、何にする？',    'description' => '甘いの？寝る？'],
            ['title' => '今やってること、一言で！',      'description' => '勉強/仕事/休憩など'],
        ];

        $now = Carbon::now('Asia/Tokyo');

        foreach ($topics as $i => $t) {
            Topic::create([
                'room_id' => $room->id,
                'title' => $t['title'],
                'description' => $t['description'],
                'starts_at' => $now->copy()->startOfDay()->addMinutes($i * 5),
                'ends_at' => $now->copy()->startOfDay()->addMinutes(($i + 1) * 5),
                'is_active' => true,
                'created_by_user_id' => null,
            ]);
        }
    }
}
