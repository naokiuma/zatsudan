<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void
	{
		Schema::create('topic_comments', function (Blueprint $table) {
			$table->id();

			$table->foreignId('topic_id')
				->constrained('topics')
				->cascadeOnDelete()
				->cascadeOnUpdate();

			$table->foreignId('comment_id')
				->constrained('comments')
				->cascadeOnDelete()
				->cascadeOnUpdate();

			$table->timestamp('created_at')->useCurrent();

			// 1コメントは基本1topicにだけ紐付く想定
			$table->unique('comment_id', 'uq_topic_comments_comment');
			$table->index('topic_id', 'idx_topic_comments_topic');
		});
	}

	public function down(): void
	{
		Schema::dropIfExists('topic_comments');
	}
};
