<?php

namespace Database\Seeders;

use App\Models\Room;
use Illuminate\Database\Seeder;

class RoomSeeder extends Seeder
{
    public function run(): void
    {
        Room::create([
            'name' => 'メインルーム',
            'slug' => 'main',
            'description' => 'みんなの広場',
            'is_active' => true,
        ]);
    }
}
