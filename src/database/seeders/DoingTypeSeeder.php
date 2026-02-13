<?php

namespace Database\Seeders;

use App\Models\DoingType;
use Illuminate\Database\Seeder;

class DoingTypeSeeder extends Seeder
{
    public function run(): void
    {
        $doings = [
            ['key' => 'study',  'label' => '勉強',       'emoji' => '📚', 'color' => '#3B82F6', 'move_chance' => 0.30, 'move_distance' => 4,  'css_anim' => 'doing-subtle-wobble 3s ease-in-out infinite'],
            ['key' => 'movie',  'label' => '映画鑑賞',   'emoji' => '🍿', 'color' => '#F97316', 'move_chance' => 0.10, 'move_distance' => 2,  'css_anim' => 'doing-bounce 4s ease-in-out infinite'],
            ['key' => 'work',   'label' => '仕事',       'emoji' => '💻', 'color' => '#10B981', 'move_chance' => 0.50, 'move_distance' => 6,  'css_anim' => 'doing-shake 2s ease-in-out infinite'],
            ['key' => 'game',   'label' => 'ゲーム',     'emoji' => '🎮', 'color' => '#EC4899', 'move_chance' => 1.00, 'move_distance' => 25, 'css_anim' => 'doing-energetic 0.5s ease-in-out infinite'],
            ['key' => 'clean',  'label' => 'お掃除',     'emoji' => '🧹', 'color' => '#A855F7', 'move_chance' => 0.70, 'move_distance' => 10, 'css_anim' => 'doing-sway 2s ease-in-out infinite'],
            ['key' => 'think',  'label' => '考え中',     'emoji' => '💭', 'color' => '#F59E0B', 'move_chance' => 0.20, 'move_distance' => 3,  'css_anim' => 'doing-float 4s ease-in-out infinite'],
            ['key' => 'idle',   'label' => '何もしてない', 'emoji' => '',   'color' => '#9CA3AF', 'move_chance' => 0.00, 'move_distance' => 0,  'css_anim' => 'none'],
        ];

        foreach ($doings as $i => $d) {
            DoingType::create(array_merge($d, [
                'scope' => 'system',
                'owner_user_id' => null,
                'is_active' => true,
                'sort_order' => $i,
            ]));
        }
    }
}
