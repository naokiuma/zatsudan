<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comment extends Model
{
	use SoftDeletes;

	protected $fillable = [
		'room_id',
		'user_id',
		'day',
		'doing_id',
		'reply_to_comment_id',
		'content',
	];

	protected function casts(): array
	{
		return [
			'day' => 'date',
		];
	}

	public function room()
	{
		return $this->belongsTo(Room::class);
	}

	public function user()
	{
		return $this->belongsTo(User::class);
	}

	public function doing()
	{
		return $this->belongsTo(Doing::class);
	}

	public function replyTo()
	{
		return $this->belongsTo(Comment::class, 'reply_to_comment_id');
	}

	public function replies()
	{
		return $this->hasMany(Comment::class, 'reply_to_comment_id');
	}

	public function topicComment()
	{
		return $this->hasOne(TopicComment::class);
	}
}
