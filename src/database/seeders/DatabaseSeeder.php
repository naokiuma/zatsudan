<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Room;
use App\Models\DoingType;
use App\Models\Doing;
use Carbon\Carbon;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // 1. ルーム
        $this->call(RoomSeeder::class);

        // 2. テスト用ユーザー15名
        $names = [
            'なお', 'さくら', 'けんた', 'ゆい', 'たくみ',
            'みお', 'りり', 'けんと', 'まい', 'あずき',
            'しんじ', 'あきら', 'さとし', 'みほ', 'れん',
        ];

        $room = Room::where('slug', 'main')->first();

        foreach ($names as $i => $name) {
            User::factory()->create([
                'name' => $name,
                'email' => "user" . ($i + 1) . "@example.com",
                'presence_status' => 'online',
                'current_room_id' => $room->id,
            ]);
        }

        // 3. doing_types
        $this->call(DoingTypeSeeder::class);

        // 4. 各ユーザーに初期 doing を割り当て
        $users = User::all();
        $doingTypes = DoingType::where('scope', 'system')
            ->where('key', '!=', 'idle')
            ->get();
        $today = Carbon::now('Asia/Tokyo')->toDateString();

        foreach ($users as $user) {
            $type = $doingTypes->random();
            Doing::create([
                'user_id' => $user->id,
                'room_id' => $room->id,
                'doing_type_id' => $type->id,
                'day' => $today,
                'started_at' => Carbon::now()->subMinutes(rand(5, 60)),
                'is_current' => true,
            ]);
        }

        // 5. トピック
        $this->call(TopicSeeder::class);
    }
}
