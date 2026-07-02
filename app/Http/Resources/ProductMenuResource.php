<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductMenuResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'name' => $this->name,
            'selling_price' => (float) $this->selling_price,
            'is_perishable' => (bool) $this->is_perishable,
            // Only load bottle weight specs if it exists (Spirits/Liquors)
            'bottle' => $this->whenLoaded('bottle', function () {
                return $this->bottle ? [
                    'id' => $this->bottle->id,
                    'is_weighable' => (bool) $this->bottle->is_weighable,
                    'capacity_ml' => (int) $this->bottle->capacity_ml,
                    'tare_weight_g' => (int) $this->bottle->tare_weight_g,
                    'gross_weight_g' => (int) $this->bottle->gross_weight_g,
                ] : null;
            }),
        ];
    }
}