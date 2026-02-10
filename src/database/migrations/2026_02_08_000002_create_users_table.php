<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void
	{
		Schema::table('users', function (Blueprint $table) {
			$table->enum('presence_status', ['online', 'away', 'offline', 'sleep'])
				->default('offline')
				->after('password');

			$table->dateTime('last_seen_at')->nullable()->after('presence_status');

			$table->foreignId('current_room_id')
				->nullable()
				->after('last_seen_at')
				->constrained('rooms')
				->nullOnDelete()
				->cascadeOnUpdate();

			$table->index(['presence_status', 'last_seen_at'], 'idx_users_presence');
			$table->index(['current_room_id'], 'idx_users_current_room');
		});
	}

	public function down(): void
	{
		Schema::table('users', function (Blueprint $table) {
			$table->dropIndex('idx_users_presence');
			$table->dropIndex('idx_users_current_room');
			$table->dropConstrainedForeignId('current_room_id');
			$table->dropColumn(['presence_status', 'last_seen_at']);
		});
	}
};
