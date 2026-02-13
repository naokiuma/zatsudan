<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TopicComment extends Model
{
	public $timestamps = false;

	protected $fillable = [
		'topic_id',
		'comment_id',
	];

	protected function casts(): array
	{
		return [
			'created_at' => 'datetime',
		];
	}

	public function topic()
	{
		return $this->belongsTo(Topic::class);
	}

	public function comment()
	{
		return $this->belongsTo(Comment::class);
	}
}
