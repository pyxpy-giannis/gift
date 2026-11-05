package com.doghome.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private WebView webView;
    private static final int REQ_NOTIFY = 1001;
    private static final int REQ_LOCATION = 1002;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        int bg = Color.parseColor("#FFF9F3");
        Window window = getWindow();
        window.setStatusBarColor(bg);
        window.setNavigationBarColor(bg);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }

        ReminderScheduler.ensureChannel(this);
        askNotificationPermission();

        webView = new WebView(this);
        webView.setBackgroundColor(bg);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setSavePassword(false);
        s.setSaveFormData(false);
        s.setLoadsImagesAutomatically(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setGeolocationEnabled(true);

        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new Bridge(), "Android");
        setContentView(webView);

        webView.loadUrl("file:///android_asset/www/index.html");
    }

    private void askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission("android.permission.POST_NOTIFICATIONS")
                    != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, REQ_NOTIFY);
            }
        }
    }

    private boolean hasLocationPermission() {
        if (Build.VERSION.SDK_INT < 23) return true;
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    @SuppressLint("MissingPermission")
    private void requestLocation() {
        if (!hasLocationPermission()) {
            requestPermissions(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
            }, REQ_LOCATION);
            return;
        }

        final LocationManager lm = (LocationManager) getSystemService(LOCATION_SERVICE);
        if (lm == null) {
            sendLocationFail();
            return;
        }

        Location best = null;
        try {
            for (String provider : new String[]{LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER}) {
                Location l = lm.getLastKnownLocation(provider);
                if (l != null && (best == null || l.getTime() > best.getTime())) best = l;
            }
        } catch (SecurityException ignored) {
        }

        if (best != null) {
            sendLocation(best);
            return;
        }

        final LocationListener listener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                sendLocation(location);
                try {
                    lm.removeUpdates(this);
                } catch (Exception ignored) {
                }
            }

            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) {}

            @Override
            public void onProviderEnabled(String provider) {}

            @Override
            public void onProviderDisabled(String provider) {}
        };

        try {
            lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 0, 0, listener, Looper.getMainLooper());
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 0, 0, listener, Looper.getMainLooper());
        } catch (Exception ignored) {
        }

        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                try {
                    lm.removeUpdates(listener);
                } catch (Exception ignored) {
                }
                sendLocationFail();
            }
        }, 10000);
    }

    private void sendLocation(Location loc) {
        if (webView == null) return;
        String js = "window.onNativeLocation && window.onNativeLocation("
                + loc.getLatitude() + "," + loc.getLongitude() + ")";
        webView.evaluateJavascript(js, null);
    }

    private void sendLocationFail() {
        if (webView == null) return;
        webView.evaluateJavascript("window.onNativeLocationFail && window.onNativeLocationFail()", null);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == REQ_LOCATION) {
            if (hasLocationPermission()) requestLocation();
            else sendLocationFail();
        }
    }

    /** 供网页调用的桥 */
    public class Bridge {
        @JavascriptInterface
        public void syncReminders(String json) {
            ReminderScheduler.sync(MainActivity.this, json);
        }

        @JavascriptInterface
        public void testNotification(final String title, final String text) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    ReminderScheduler.notifyNow(MainActivity.this, title, text);
                }
            });
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    askNotificationPermission();
                }
            });
        }

        @JavascriptInterface
        public void locate() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    requestLocation();
                }
            });
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            moveTaskToBack(true);
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
