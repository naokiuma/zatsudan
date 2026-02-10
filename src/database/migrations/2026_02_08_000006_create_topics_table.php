<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void
	{
		Schema::create('topics', function (Blueprint $table) {
			$table->id();

			$table->foreignId('room_id')
				->constrained('rooms')
				->cascadeOnDelete()
				->cascadeOnUpdate();

			$table->string('title', 255);
			$table->text('description')->nullable();

			$table->dateTime('starts_at');
			$table->dateTime('ends_at')->nullable();

			$table->boolean('is_active')->default(true);

			$table->foreignId('created_by_user_id')
				->nullable()
				->constrained('users')
				->nullOnDelete()
				->cascadeOnUpdate();

			$table->timestamps();

			$table->index(['room_id', 'is_active', 'starts_at'], 'idx_topics_room_active');
			$table->index(['room_id', 'starts_at', 'ends_at'], 'idx_topics_room_time');
			$table->index(['created_by_user_id'], 'idx_topics_created_by');
		});
	}

	public function down(): void
	{
		Schema::dropIfExists('topics');
	}
};
