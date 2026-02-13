<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void
	{
		// 1. doing_type_key カラムを追加
		Schema::table('doings', function (Blueprint $table) {
			$table->string('doing_type_key', 64)->after('doing_type_id')->default('');
		});

		// 2. 既存データの doing_type_id → key に変換
		DB::statement('
			UPDATE doings
			INNER JOIN doing_types ON doings.doing_type_id = doing_types.id
			SET doings.doing_type_key = doing_types.`key`
		');

		// 3. 外部キー制約を削除 → doing_type_id カラムを削除
		Schema::table('doings', function (Blueprint $table) {
			$table->dropForeign(['doing_type_id']);
			$table->dropColumn('doing_type_id');
		});

		// 4. デフォルト値を解除し、インデックス追加
		Schema::table('doings', function (Blueprint $table) {
			$table->string('doing_type_key', 64)->default(null)->change();
			$table->index('doing_type_key', 'idx_doings_doing_type_key');
		});
	}

	public function down(): void
	{
		Schema::table('doings', function (Blueprint $table) {
			$table->dropIndex('idx_doings_doing_type_key');
		});

		Schema::table('doings', function (Blueprint $table) {
			$table->unsignedBigInteger('doing_type_id')->after('room_id')->default(0);
		});

		// doing_type_key → doing_type_id に戻す（doing_types テーブルが存在する前提）
		if (Schema::hasTable('doing_types')) {
			DB::statement('
				UPDATE doings
				INNER JOIN doing_types ON doings.doing_type_key = doing_types.`key`
				SET doings.doing_type_id = doing_types.id
			');
		}

		Schema::table('doings', function (Blueprint $table) {
			$table->dropColumn('doing_type_key');
			$table->foreign('doing_type_id')
				->references('id')
				->on('doing_types')
				->restrictOnDelete()
				->cascadeOnUpdate();
			$table->unsignedBigInteger('doing_type_id')->default(null)->change();
		});
	}
};
