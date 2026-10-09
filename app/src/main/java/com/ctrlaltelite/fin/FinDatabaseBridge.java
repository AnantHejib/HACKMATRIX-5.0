package com.ctrlaltelite.fin;

import android.content.Context;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

final class FinDatabaseBridge {
    private final FinDatabaseHelper database;

    FinDatabaseBridge(Context context) {
        database = new FinDatabaseHelper(context.getApplicationContext());
    }

    @JavascriptInterface
    public String loadBootstrap() {
        try {
            return success(database.loadBootstrap()).toString();
        } catch (Exception exception) {
            return failure(exception).toString();
        }
    }

    @JavascriptInterface
    public String replaceTransactions(String json, String source) {
        try {
            return success(database.replaceTransactions(new JSONArray(json), source)).toString();
        } catch (Exception exception) {
            return failure(exception).toString();
        }
    }

    @JavascriptInterface
    public String upsertTransaction(String json, String source) {
        try {
            return success(database.upsertTransaction(new JSONObject(json), source)).toString();
        } catch (Exception exception) {
            return failure(exception).toString();
        }
    }

    @JavascriptInterface
    public String updateCategory(String id, String category) {
        try {
            return success(database.updateCategory(id, category)).toString();
        } catch (Exception exception) {
            return failure(exception).toString();
        }
    }

    @JavascriptInterface
    public String saveFinancialProfile(String json) {
        try {
            return success(database.saveFinancialProfile(new JSONObject(json))).toString();
        } catch (Exception exception) {
            return failure(exception).toString();
        }
    }

    @JavascriptInterface
    public String saveAnalysis(String json) {
        try {
            return success(database.saveAnalysis(new JSONObject(json))).toString();
        } catch (Exception exception) {
            return failure(exception).toString();
        }
    }

    void close() {
        database.close();
    }

    private JSONObject success(JSONObject data) {
        JSONObject response = new JSONObject();
        try {
            response.put("ok", true);
            response.put("data", data);
        } catch (Exception ignored) {
        }
        return response;
    }

    private JSONObject failure(Exception exception) {
        JSONObject response = new JSONObject();
        try {
            response.put("ok", false);
            response.put("error", exception.getMessage() == null ? "Database operation failed" : exception.getMessage());
        } catch (Exception ignored) {
        }
        return response;
    }
}
