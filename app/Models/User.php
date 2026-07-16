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
use App\Models\Shop;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasUuids;

    protected $fillable = [
        'shop_id', // Nullable: The current active workplace roster location for shifts
        'name',
        'email',
        'email_verified_at',
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

    // App\Models\User.php

    public function getAccessibleShopIds(): array
    {
        // 1. System Admin: Returns all shop IDs (or empty array if you want to handle logic differently)
        if ($this->role === UserRole::SYSTEM_ADMIN) {
            return Shop::pluck('id')->toArray();
        }

        // 2. Owner: Uses your existing shopsOwned relationship
        if ($this->role === UserRole::OWNER) {
            return $this->shopsOwned()->pluck('shops.id')->toArray();
        }

        // 3. Managers: Returns their single assigned shop ID as an array
        return [$this->shop_id];
    }

    /**
     * Staff roster context. The physical venue where this user executes shifts.
     */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'shop_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'user_id');
    }

    function tables(): HasMany
    {
        return $this->hasMany(Table::class, 'user_id');
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class, 'user_id');
    }
    public function wasteLogs(): HasMany
    {
        return $this->hasMany(WasteLog::class, 'user_id');
    }

    public function hasRole(UserRole $role): bool
    {
        return $this->role === $role;
    }

    public function setPinAttribute($value)
    {
        $this->attributes['pin'] = $value ? Hash::make($value) : null;
    }
}