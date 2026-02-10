<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void
	{
		Schema::create('doing_types', function (Blueprint $table) {
			$table->id();

			$table->enum('scope', ['system', 'user'])->default('system');
			$table->foreignId('owner_user_id')
				->nullable()
				->constrained('users')
				->nullOnDelete()
				->cascadeOnUpdate();

			$table->string('key', 64);
			$table->string('label', 100);

			$table->boolean('is_active')->default(true);
			$table->integer('sort_order')->default(0);

			$table->timestamps();

			$table->index(['scope', 'owner_user_id'], 'idx_doing_types_scope_owner');
			$table->index(['is_active', 'sort_order'], 'idx_doing_types_active_sort');

			// (scope, owner_user_id, key) の複合ユニーク
			$table->unique(['scope', 'owner_user_id', 'key'], 'uq_doing_types_scope_owner_key');
		});
	}

	public function down(): void
	{
		Schema::dropIfExists('doing_types');
	}
};
