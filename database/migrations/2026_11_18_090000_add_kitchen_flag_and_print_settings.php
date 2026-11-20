<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Items in a kitchen category are sent to the kitchen device's printer.
        Schema::table('categories', function (Blueprint $table) {
            $table->boolean('is_kitchen')->default(false)->after('slug');
        });

        // Print the customer's receipt automatically when an order or table is
        // paid. Off by default, which keeps today's manual printing unchanged.
        Schema::table('shops', function (Blueprint $table) {
            $table->boolean('auto_print_receipts')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('is_kitchen');
        });

        Schema::table('shops', function (Blueprint $table) {
            $table->dropColumn('auto_print_receipts');
        });
    }
};
