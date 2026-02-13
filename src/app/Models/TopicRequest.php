<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TopicRequest extends Model
{
	protected $fillable = [
		'room_id',
		'requested_by_user_id',
		'title',
		'description',
		'status',
		'adopted_topic_id',
	];

	public function room()
	{
		return $this->belongsTo(Room::class);
	}

	public function requestedBy()
	{
		return $this->belongsTo(User::class, 'requested_by_user_id');
	}

	public function adoptedTopic()
	{
		return $this->belongsTo(Topic::class, 'adopted_topic_id');
	}
}
