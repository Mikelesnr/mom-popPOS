<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Items in a bar category print a slip on the bar device when a waiter
        // (or anyone not working in the bar) rings them up, so nothing leaves
        // the bar without being on the bill.
        Schema::table('categories', function (Blueprint $table) {
            $table->boolean('is_bar')->default(false)->after('is_kitchen');
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('is_bar');
        });
    }
};
