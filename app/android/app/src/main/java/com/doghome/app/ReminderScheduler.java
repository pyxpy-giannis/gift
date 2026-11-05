package com.doghome.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

public class ReminderScheduler {

    public static final String CHANNEL_ID = "reminders";
    public static final String PREFS = "doghome";
    public static final String KEY_REMINDERS = "reminders_json";

    public static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "纪念日提醒", NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription("纪念日、生日前的提醒");
        nm.createNotificationChannel(ch);
    }

    public static boolean canNotify(Context ctx) {
        if (Build.VERSION.SDK_INT >= 33) {
            return ctx.checkSelfPermission("android.permission.POST_NOTIFICATIONS")
                    == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    /** JS 传来的数组：[{time: 毫秒, title: "...", text: "..."}] */
    public static void sync(Context ctx, String json) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_REMINDERS, json).apply();

        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        // 先取消所有旧闹钟
        for (int i = 0; i < 500; i++) {
            Intent intent = new Intent(ctx, ReminderReceiver.class);
            PendingIntent pi = PendingIntent.getBroadcast(
                    ctx, i, intent,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
            if (pi != null) {
                am.cancel(pi);
                pi.cancel();
            }
        }

        try {
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length() && i < 200; i++) {
                JSONObject o = arr.getJSONObject(i);
                long time = o.getLong("time");
                if (time <= System.currentTimeMillis()) continue;

                Intent intent = new Intent(ctx, ReminderReceiver.class);
                intent.putExtra("title", o.optString("title", "纪念日"));
                intent.putExtra("text", o.optString("text", ""));

                PendingIntent pi = PendingIntent.getBroadcast(
                        ctx, i, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

                if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, pi);
                } else {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, pi);
                }
            }
        } catch (Exception ignored) {
        }
    }

    public static void rescheduleFromPrefs(Context ctx) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String json = prefs.getString(KEY_REMINDERS, null);
        if (json != null) sync(ctx, json);
    }

    public static void notifyNow(Context ctx, String title, String text) {
        if (!canNotify(ctx)) return;
        ensureChannel(ctx);

        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
                ctx, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            b = new Notification.Builder(ctx, CHANNEL_ID);
        } else {
            b = new Notification.Builder(ctx);
        }

        b.setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setSmallIcon(R.mipmap.ic_launcher)
                .setAutoCancel(true)
                .setContentIntent(pi);

        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify((int) (System.currentTimeMillis() % 100000), b.build());
    }
}
