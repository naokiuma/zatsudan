<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Comment extends Model
{
	protected $fillable = [
		'theme_id',
		'user_id',
		'name',
		'body',
		'gender',
		'age_range',
		'avatar_id',
	];

	public function theme()
	{
		return $this->belongsTo(Theme::class);
	}
}
