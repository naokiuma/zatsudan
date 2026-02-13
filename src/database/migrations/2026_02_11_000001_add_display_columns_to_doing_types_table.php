<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void
	{
		Schema::table('doing_types', function (Blueprint $table) {
			$table->string('emoji', 10)->default('')->after('label');
			$table->string('color', 20)->default('#9CA3AF')->after('emoji');
			$table->decimal('move_chance', 3, 2)->default(0)->after('color');
			$table->integer('move_distance')->default(0)->after('move_chance');
			$table->string('css_anim', 100)->default('none')->after('move_distance');
		});
	}

	public function down(): void
	{
		Schema::table('doing_types', function (Blueprint $table) {
			$table->dropColumn(['emoji', 'color', 'move_chance', 'move_distance', 'css_anim']);
		});
	}
};
