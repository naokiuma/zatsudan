<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void
	{
		Schema::create('topic_requests', function (Blueprint $table) {
			$table->id();

			$table->foreignId('room_id')
				->constrained('rooms')
				->cascadeOnDelete()
				->cascadeOnUpdate();

			$table->foreignId('requested_by_user_id')
				->constrained('users')
				->cascadeOnDelete()
				->cascadeOnUpdate();

			$table->string('title', 255);
			$table->text('description')->nullable();

			$table->enum('status', ['pending', 'approved', 'rejected', 'archived'])->default('pending');

			$table->foreignId('adopted_topic_id')
				->nullable()
				->constrained('topics')
				->nullOnDelete()
				->cascadeOnUpdate();

			$table->timestamps();

			$table->index(['room_id', 'status', 'created_at'], 'idx_topic_requests_room_status');
			$table->index(['requested_by_user_id', 'created_at'], 'idx_topic_requests_user');
			$table->index(['adopted_topic_id'], 'idx_topic_requests_adopted');
		});
	}

	public function down(): void
	{
		Schema::dropIfExists('topic_requests');
	}
};
