<?php

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return view('index');
});

Route::view('/p/index', 'pages.index')->name('p.index');
Route::view('/p/about', 'pages.about.index')->name('p.about');

Route::view('/name', 'index')->name('name');