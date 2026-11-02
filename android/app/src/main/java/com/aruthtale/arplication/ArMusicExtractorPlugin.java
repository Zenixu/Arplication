package com.aruthtale.arplication;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

/**
 * Bridge Capacitor untuk YtExtractor (NewPipeExtractor di dalam APK).
 *
 * Dipakai ArMusic supaya lagu YouTube bisa diputar tanpa server yt-dlp:
 *  - extractAudioUrl({ videoId }) -> { url, mimeType, bitrate, title, uploader, durationSec }
 *  - search({ query, limit })     -> { results: [{ videoId, title, artist, duration, cover }] }
 *  - status()                     -> { available, version }
 *
 * Semua pekerjaan jaringan dijalankan di thread latar; PluginCall.resolve()
 * aman dipanggil dari thread mana pun.
 */
@CapacitorPlugin(name = "ArMusicExtractor")
public class ArMusicExtractorPlugin extends Plugin {

    private static final String EXTRACTOR_VERSION = "NewPipeExtractor 0.26.5";

    @PluginMethod
    public void extractAudioUrl(final PluginCall call) {
        final String videoId = call.getString("videoId");
        if (videoId == null || videoId.trim().isEmpty()) {
            call.reject("videoId wajib diisi");
            return;
        }

        new Thread(() -> {
            try {
                YtExtractor.AudioResult result = YtExtractor.extractAudio(videoId.trim());
                JSObject out = new JSObject();
                out.put("url", result.url);
                out.put("mimeType", result.mimeType);
                out.put("bitrate", result.bitrate);
                out.put("title", result.title);
                out.put("uploader", result.uploader);
                out.put("durationSec", result.durationSec);
                out.put("source", "device");
                call.resolve(out);
            } catch (Throwable error) {
                call.reject("Ekstraksi di perangkat gagal: " + describe(error));
            }
        }, "armusic-extract").start();
    }

    @PluginMethod
    public void search(final PluginCall call) {
        final String query = call.getString("query");
        final Integer limitRaw = call.getInt("limit", 20);
        if (query == null || query.trim().isEmpty()) {
            call.reject("query wajib diisi");
            return;
        }
        final int limit = limitRaw == null ? 20 : limitRaw;

        new Thread(() -> {
            try {
                List<YtExtractor.SearchItem> items = YtExtractor.search(query.trim(), limit);
                JSArray rows = new JSArray();
                for (YtExtractor.SearchItem item : items) {
                    JSObject row = new JSObject();
                    row.put("videoId", item.videoId);
                    row.put("title", item.title);
                    row.put("artist", item.uploader);
                    row.put("duration", item.durationSec);
                    if (item.thumbnail != null) {
                        row.put("cover", item.thumbnail);
                    }
                    rows.put(row);
                }
                JSObject out = new JSObject();
                out.put("results", rows);
                out.put("source", "device");
                call.resolve(out);
            } catch (Throwable error) {
                call.reject("Pencarian di perangkat gagal: " + describe(error));
            }
        }, "armusic-search").start();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject out = new JSObject();
        out.put("available", true);
        out.put("version", EXTRACTOR_VERSION);
        call.resolve(out);
    }

    private static String describe(Throwable error) {
        String message = error.getMessage();
        if (message == null || message.trim().isEmpty()) {
            return error.getClass().getSimpleName();
        }
        return message;
    }
}
