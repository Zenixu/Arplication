package com.aruthtale.arplication;

import org.schabi.newpipe.extractor.InfoItem;
import org.schabi.newpipe.extractor.NewPipe;
import org.schabi.newpipe.extractor.ServiceList;
import org.schabi.newpipe.extractor.downloader.Downloader;
import org.schabi.newpipe.extractor.downloader.Request;
import org.schabi.newpipe.extractor.downloader.Response;
import org.schabi.newpipe.extractor.exceptions.ExtractionException;
import org.schabi.newpipe.extractor.localization.ContentCountry;
import org.schabi.newpipe.extractor.localization.Localization;
import org.schabi.newpipe.extractor.search.SearchExtractor;
import org.schabi.newpipe.extractor.stream.AudioStream;
import org.schabi.newpipe.extractor.stream.StreamInfo;
import org.schabi.newpipe.extractor.stream.StreamInfoItem;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Ekstraksi audio YouTube langsung di perangkat lewat NewPipeExtractor.
 *
 * Ini menggantikan kebutuhan server yt-dlp: tidak ada laptop yang harus menyala,
 * tidak ada VPS. Semua request HTTP keluar dari HP pengguna.
 *
 * Sengaja ditulis sebagai Java murni (tanpa import android.*) supaya bisa diuji
 * di JVM biasa sebelum dibungkus ke APK.
 */
public final class YtExtractor {

    private static final String TAG = "YtExtractor";
    private static final Pattern VIDEO_ID =
            Pattern.compile("[?&]v=([A-Za-z0-9_-]{11})");
    private static final Object LOCK = new Object();
    private static volatile boolean initialized = false;

    private YtExtractor() {
    }

    /** Hasil ekstraksi satu video. */
    public static final class AudioResult {
        public String url;
        public String mimeType;
        public int bitrate;
        public String title;
        public String uploader;
        public long durationSec;
    }

    /** Satu baris hasil pencarian. */
    public static final class SearchItem {
        public String videoId;
        public String title;
        public String uploader;
        public String thumbnail;
        public long durationSec;
    }

    /** Downloader NewPipe di atas OkHttp. */
    private static final class OkHttpDownloader extends Downloader {
        private final okhttp3.OkHttpClient client = new okhttp3.OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(25, TimeUnit.SECONDS)
                .followRedirects(true)
                .retryOnConnectionFailure(true)
                .build();

        @Override
        public Response execute(Request request) throws IOException {
            okhttp3.Request.Builder builder = new okhttp3.Request.Builder().url(request.url());
            String method = request.httpMethod();
            byte[] data = request.dataToSend();

            if (data != null) {
                builder.method(method, okhttp3.RequestBody.create(
                        data, okhttp3.MediaType.parse("application/json")));
            } else if (!"GET".equals(method) && !"HEAD".equals(method)) {
                builder.method(method, okhttp3.RequestBody.create(new byte[0], null));
            }

            for (Map.Entry<String, List<String>> entry : request.headers().entrySet()) {
                for (String value : entry.getValue()) {
                    builder.addHeader(entry.getKey(), value);
                }
            }

            try (okhttp3.Response response = client.newCall(builder.build()).execute()) {
                String body = response.body() == null ? "" : response.body().string();
                return new Response(
                        response.code(),
                        response.message(),
                        response.headers().toMultimap(),
                        body,
                        response.request().url().toString());
            }
        }
    }

    /** Inisialisasi sekali saja; aman dipanggil dari thread mana pun. */
    public static void ensureInit() {
        if (initialized) {
            return;
        }
        synchronized (LOCK) {
            if (initialized) {
                return;
            }
            NewPipe.init(
                    new OkHttpDownloader(),
                    Localization.fromLocale(Locale.ENGLISH),
                    new ContentCountry("ID"));
            initialized = true;
        }
    }

    /**
     * Ambil URL audio terbaik untuk satu video.
     * Kualitas dipilih dari bitrate tertinggi yang formatnya bisa diputar ExoPlayer.
     */
    public static AudioResult extractAudio(String videoId) throws IOException, ExtractionException {
        if (videoId == null || videoId.length() != 11) {
            throw new IOException("ID video tidak valid: " + videoId);
        }
        ensureInit();

        StreamInfo info = StreamInfo.getInfo(
                ServiceList.YouTube,
                "https://www.youtube.com/watch?v=" + videoId);

        AudioStream best = null;
        for (AudioStream stream : info.getAudioStreams()) {
            String mime = stream.getFormat() == null ? "" : String.valueOf(stream.getFormat().getMimeType());
            if (!mime.contains("audio")) {
                continue;
            }
            if (best == null || stream.getAverageBitrate() > best.getAverageBitrate()) {
                best = stream;
            }
        }
        if (best == null) {
            throw new IOException("Tidak ada audio stream yang bisa diputar untuk video ini.");
        }

        AudioResult result = new AudioResult();
        result.url = best.getUrl();
        result.mimeType = best.getFormat() == null ? "audio/webm" : String.valueOf(best.getFormat().getMimeType());
        result.bitrate = best.getAverageBitrate();
        result.title = info.getName();
        result.uploader = info.getUploaderName();
        result.durationSec = info.getDuration();
        return result;
    }

    /** Cari video di YouTube tanpa server. */
    public static List<SearchItem> search(String query, int limit) throws IOException, ExtractionException {
        ensureInit();
        int max = Math.max(1, Math.min(limit, 30));
        List<SearchItem> out = new ArrayList<>();

        SearchExtractor extractor = ServiceList.YouTube.getSearchExtractor(query);
        extractor.fetchPage();

        for (InfoItem item : extractor.getInitialPage().getItems()) {
            if (out.size() >= max) {
                break;
            }
            if (!(item instanceof StreamInfoItem)) {
                continue;
            }
            StreamInfoItem stream = (StreamInfoItem) item;
            String id = videoIdFrom(stream.getUrl());
            if (id == null) {
                continue;
            }
            SearchItem row = new SearchItem();
            row.videoId = id;
            row.title = stream.getName() == null ? "Tanpa Judul" : stream.getName();
            row.uploader = stream.getUploaderName() == null ? "YouTube" : stream.getUploaderName();
            row.durationSec = stream.getDuration();
            try {
                if (stream.getThumbnails() != null && !stream.getThumbnails().isEmpty()) {
                    row.thumbnail = stream.getThumbnails()
                            .get(stream.getThumbnails().size() - 1).getUrl();
                }
            } catch (Exception ignored) {
                // thumbnail opsional
            }
            out.add(row);
        }
        return out;
    }

    /** Ambil ID video 11 karakter dari URL YouTube. */
    public static String videoIdFrom(String url) {
        if (url == null) {
            return null;
        }
        Matcher matcher = VIDEO_ID.matcher(url);
        if (matcher.find()) {
            return matcher.group(1);
        }
        if (url.contains("/shorts/")) {
            String rest = url.substring(url.indexOf("/shorts/") + 8);
            if (rest.length() >= 11) {
                return rest.substring(0, 11);
            }
        }
        if (url.contains("youtu.be/")) {
            String rest = url.substring(url.indexOf("youtu.be/") + 9);
            if (rest.length() >= 11) {
                return rest.substring(0, 11);
            }
        }
        return null;
    }
}
