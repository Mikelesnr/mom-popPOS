<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Test/Demo Account Password
    |--------------------------------------------------------------------------
    |
    | Used by UserFactory to seed dummy/demo accounts (e.g. the sample shop
    | people can try before creating their own), and referenced by the
    | matching feature tests so the two can never drift out of sync again.
    | This is NOT used for real customer accounts.
    |
    */

    'default_password' => env('TEST_DEFAULT_PASSWORD', 'Test1234#'),

];
