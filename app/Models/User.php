<?php
// app/Models/User.php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasUuids;

    protected $fillable = [
        'shop_id', // Nullable: The current active workplace roster location for shifts
        'name',
        'email',
        'password',
        'role',
        'pin',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'pin',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    /**
     * REAL-WORLD PARITY RELATIONSHIP:
     * Many-to-Many mapping for multi-owner partnerships across multiple businesses.
     */
    public function shopsOwned(): BelongsToMany
    {
        return $this->belongsToMany(Shop::class, 'shop_owners', 'user_id', 'shop_id')
                    ->withTimestamps();
    }

    /**
     * Staff roster context. The physical venue where this user executes shifts.
     */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'shop_id');
    }

    public function shifts(): HasMany { return $this->hasMany(Shift::class, 'user_id'); }
    public function wasteLogs(): HasMany { return $this->hasMany(WasteLog::class, 'user_id'); }

    public function hasRole(UserRole $role): bool
    {
        return $this->role === $role;
    }

    public function setPinAttribute($value)
    {
        $this->attributes['pin'] = $value ? Hash::make($value) : null;
    }
}