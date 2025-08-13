<?php
/**
 * 获取客户端 IP 地址
 * @return string 客户端IP地址
 */
function getClientIP() {
    $ipaddress = 'UNKNOWN';
    if (isset($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        $ipaddress = $_SERVER['HTTP_CF_CONNECTING_IP'];
    } elseif (isset($_SERVER['HTTP_X_REAL_IP'])) {
        $ipaddress = $_SERVER['HTTP_X_REAL_IP'];
    } elseif (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ipaddress = trim(reset($ips));
    } elseif (isset($_SERVER['REMOTE_ADDR'])) {
        $ipaddress = $_SERVER['REMOTE_ADDR'];
    }
    if (!filter_var($ipaddress, FILTER_VALIDATE_IP)) {
        $ipaddress = 'INVALID_IP_FORMAT';
    }
    return $ipaddress;
}


