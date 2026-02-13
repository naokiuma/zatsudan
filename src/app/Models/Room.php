<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
	protected $fillable = [
		'name',
		'slug',
		'description',
		'is_active',
	];

	protected function casts(): array
	{
		return [
			'is_active' => 'boolean',
		];
	}

	public function topics()
	{
		return $this->hasMany(Topic::class);
	}

	public function doings()
	{
		return $this->hasMany(Doing::class);
	}

	public function comments()
	{
		return $this->hasMany(Comment::class);
	}
}
