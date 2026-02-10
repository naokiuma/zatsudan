<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void
	{
		// ① 既にあったら削除（なければ何もしない）
		Schema::dropIfExists('comments');

		// ② 新しい定義で作り直す
		Schema::create('comments', function (Blueprint $table) {
			$table->id();

			$table->foreignId('room_id')
				->constrained('rooms')
				->cascadeOnDelete()
				->cascadeOnUpdate();

			$table->foreignId('user_id')
				->constrained('users')
				->cascadeOnDelete()
				->cascadeOnUpdate();

			$table->date('day');

			$table->foreignId('doing_id')
				->nullable()
				->constrained('doings')
				->nullOnDelete()
				->cascadeOnUpdate();

			$table->foreignId('reply_to_comment_id')
				->nullable()
				->constrained('comments')
				->nullOnDelete()
				->cascadeOnUpdate();

			$table->text('content');

			$table->softDeletes(); // deleted_at
			$table->timestamps();

			$table->index(['room_id', 'day', 'created_at'], 'idx_comments_room_day_created');
			$table->index(['user_id', 'created_at'], 'idx_comments_user_created');
			$table->index(['doing_id'], 'idx_comments_doing');
			$table->index(['reply_to_comment_id'], 'idx_comments_reply');
			$table->index(['deleted_at'], 'idx_comments_deleted');
		});
	}

	public function down(): void
	{
		Schema::dropIfExists('comments');
	}
};
