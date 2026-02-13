<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Topic extends Model
{
	protected $fillable = [
		'room_id',
		'title',
		'description',
		'starts_at',
		'ends_at',
		'is_active',
		'created_by_user_id',
	];

	protected function casts(): array
	{
		return [
			'starts_at' => 'datetime',
			'ends_at' => 'datetime',
			'is_active' => 'boolean',
		];
	}

	public function room()
	{
		return $this->belongsTo(Room::class);
	}

	public function createdBy()
	{
		return $this->belongsTo(User::class, 'created_by_user_id');
	}

	public function topicComments()
	{
		return $this->hasMany(TopicComment::class);
	}

	public function comments()
	{
		return $this->hasManyThrough(Comment::class, TopicComment::class, 'topic_id', 'id', 'id', 'comment_id');
	}
}
