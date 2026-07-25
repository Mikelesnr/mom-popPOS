<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding payment methods catalog...');

        $methods = [
            ['name' => 'Cash', 'slug' => 'cash'],
            ['name' => 'EcoCash', 'slug' => 'ecocash'],
            ['name' => 'Card', 'slug' => 'card'],
            ['name' => 'OneMoney', 'slug' => 'onemoney'],
            ['name' => 'InBucks', 'slug' => 'inbucks'],
            ['name' => 'Omari', 'slug' => 'omari'],
        ];

        $count = 0;
        foreach ($methods as $method) {
            PaymentMethod::updateOrCreate(
                ['slug' => $method['slug']],
                [
                    'name' => $method['name'],
                    'is_active' => true,
                ]
            );
            $count++;
        }

        $this->command->info("Successfully seeded {$count} payment methods.");
    }
}