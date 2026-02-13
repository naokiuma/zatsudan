<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Doing extends Model
{
	protected $fillable = [
		'user_id',
		'room_id',
		'doing_type_id',
		'day',
		'started_at',
		'ended_at',
		'is_current',
	];

	protected function casts(): array
	{
		return [
			'day' => 'date',
			'started_at' => 'datetime',
			'ended_at' => 'datetime',
			'is_current' => 'boolean',
		];
	}

	public function user()
	{
		return $this->belongsTo(User::class);
	}

	public function room()
	{
		return $this->belongsTo(Room::class);
	}

	public function doingType()
	{
		return $this->belongsTo(DoingType::class);
	}

	public function comments()
	{
		return $this->hasMany(Comment::class);
	}
}
