<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
	/**
	 * Run the migrations.
	 */
	public function up(): void
	{
		Schema::create('comments', function (Blueprint $table) {
			$table->id();

			$table->foreignId('theme_id')->constrained('themes')->cascadeOnDelete();
			$table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

			$table->string('name')->nullable();
			$table->text('body');

			$table->string('gender', 20)->nullable();
			$table->string('age_range', 20)->nullable();
			$table->unsignedTinyInteger('avatar_id')->default(1);

			$table->timestamps();

			$table->index(['theme_id', 'created_at']);
		});
	}

	/**
	 * Reverse the migrations.
	 */
	public function down(): void
	{
		Schema::dropIfExists('comments');
	}
};
