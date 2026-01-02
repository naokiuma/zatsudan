<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Theme extends Model
{
    protected $fillable = [
		'user_id',
		'name',
		'body',
		'times',
	];
}
