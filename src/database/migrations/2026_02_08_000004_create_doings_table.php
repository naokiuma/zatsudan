<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void
	{
		Schema::create('doings', function (Blueprint $table) {
			$table->id();

			$table->foreignId('user_id')
				->constrained('users')
				->cascadeOnDelete()
				->cascadeOnUpdate();

			$table->foreignId('room_id')
				->constrained('rooms')
				->cascadeOnDelete()
				->cascadeOnUpdate();

			$table->foreignId('doing_type_id')
				->constrained('doing_types')
				->restrictOnDelete()
				->cascadeOnUpdate();

			$table->date('day'); // JSTで切って保存想定
			$table->dateTime('started_at');
			$table->dateTime('ended_at')->nullable();
			$table->boolean('is_current')->default(true);

			$table->timestamps();

			$table->index(['room_id', 'day'], 'idx_doings_room_day');
			$table->index(['user_id', 'room_id', 'day'], 'idx_doings_user_room_day');
			$table->index(['room_id', 'day', 'is_current'], 'idx_doings_current');
		});
	}

	public function down(): void
	{
		Schema::dropIfExists('doings');
	}
};
