<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DoingType extends Model
{
	protected $fillable = [
		'scope',
		'owner_user_id',
		'key',
		'label',
		'emoji',
		'color',
		'move_chance',
		'move_distance',
		'css_anim',
		'is_active',
		'sort_order',
	];

	protected function casts(): array
	{
		return [
			'is_active' => 'boolean',
			'move_chance' => 'float',
			'move_distance' => 'integer',
			'sort_order' => 'integer',
		];
	}

	public function doings()
	{
		return $this->hasMany(Doing::class);
	}
}
