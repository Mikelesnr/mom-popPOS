<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary(); // Generated on the React Native edge client
            $table->foreignUuid('shift_id')->constrained('shifts');
            $table->uuid('table_id')->nullable(); // Foreign key added in later step to avoid circular clashes
            $table->decimal('total_amount', 10, 2)->default(0.00);
            $table->string('payment_method')->nullable();
            $table->string('status'); // Maps to OrderStatus Enum
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};