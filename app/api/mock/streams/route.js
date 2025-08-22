import { NextResponse } from 'next/server';

// Mock data that matches the structure of the real API response
const mockData = {
  "streams": [
    {
      "stream_id": "463f36ef-5c4f-4a94-a312-af41577b7ffb",
      "account_id": "00000000-0000-4000-b000-000000000146",
      "name": "Blue Area Savour Food",
      "description": "Blue Area Savour Food in Islamabad",
      "data": {
        "type": "tcp",
        "reference": "rtsp://admin:admin123@10.0.45.78:554",
        "roi": {
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "mode": "abs"
        },
        "rotation": 0,
        "preferred_program_stream_frame_width": 800,
        "endless": true,
        "droi": {
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "mode": "abs"
        }
      },
      "location": {
        "city": "Islamabad",
        "area": "Blue Area",
        "district": "Islamabad",
        "street": "Jinnah Avenue",
        "house_number": "45",
        "geo_position": {
          "latitude": 33.7293,
          "longitude": 73.0931
        }
      },
      "status": "active",
      "version": 2,
      "create_time": "2025-03-11T15:59:44.628974+05:00",
      "autorestart": {
        "restart": 1,
        "attempt_count": 10,
        "delay": 60,
        "current_attempt": 0,
        "last_attempt_time": "2025-03-14T13:53:31.900997+05:00",
        "status": "enabled"
      },
      "event_handler": {
        "origin": "http://127.0.0.1:5000/",
        "api_version": 6,
        "bestshot_handler": {
          "handler_id": "b2871790-039c-4e2d-bb1b-7bebe1ebb7d9"
        },
        "frame_store": "http://127.0.0.1:5000/6/images",
        "authorization": {
          "account_id": "00000000-0000-4000-b000-000000000146"
        },
        "detection_handler": null
      },
      "policies": {
        "sending": {
          "time_period_of_searching": -1,
          "silent_period": 0,
          "type": "sec",
          "number_of_bestshots_to_send": 1,
          "send_only_full_set": true,
          "delete_track_after_sending": false
        }
      },
      "last_error": null,
      "video_info": null,
      "preview": null,
      "groups": []
    },
    {
      "stream_id": "5fa16d82-2512-4ad1-86b5-98dcf921646f",
      "account_id": "00000000-0000-4000-b000-000000000146",
      "name": "F-10 Markaz",
      "description": "F-10 Markaz shopping area in Islamabad",
      "data": {
        "type": "tcp",
        "reference": "rtsp://admin:admin123@10.0.40.218:554",
        "roi": {
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "mode": "abs"
        },
        "rotation": 0,
        "preferred_program_stream_frame_width": 800,
        "endless": true,
        "droi": {
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "mode": "abs"
        }
      },
      "location": {
        "city": "Islamabad",
        "area": "F-10",
        "district": "Islamabad",
        "street": "Main Avenue",
        "house_number": "123",
        "geo_position": {
          "latitude": 33.695,
          "longitude": 73.035
        }
      },
      "status": "pause",
      "version": 2,
      "create_time": "2025-03-11T15:59:44.628974+05:00",
      "autorestart": {
        "restart": 1,
        "attempt_count": 10,
        "delay": 60,
        "current_attempt": 0,
        "last_attempt_time": "2025-03-14T13:53:31.900997+05:00",
        "status": "enabled"
      },
      "event_handler": {
        "origin": "http://127.0.0.1:5000/",
        "api_version": 6,
        "bestshot_handler": {
          "handler_id": "b2871790-039c-4e2d-bb1b-7bebe1ebb7d9"
        },
        "frame_store": "http://127.0.0.1:5000/6/images",
        "authorization": {
          "account_id": "00000000-0000-4000-b000-000000000146"
        },
        "detection_handler": null
      },
      "policies": {
        "sending": {
          "time_period_of_searching": -1,
          "silent_period": 0,
          "type": "sec",
          "number_of_bestshots_to_send": 1,
          "send_only_full_set": true,
          "delete_track_after_sending": false
        }
      },
      "last_error": null,
      "video_info": null,
      "preview": null,
      "groups": []
    },
    {
      "stream_id": "7bc45d2f-8e9a-4b1c-9d3e-5f6a7b8c9d0e",
      "account_id": "00000000-0000-4000-b000-000000000146",
      "name": "Faisal Masjid",
      "description": "Faisal Masjid stream for testing",
      "data": {
        "type": "tcp",
        "reference": "rtsp://admin:admin123@10.0.40.220:554",
        "roi": {
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "mode": "abs"
        },
        "rotation": 0,
        "preferred_program_stream_frame_width": 800,
        "endless": true,
        "droi": {
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "mode": "abs"
        }
      },
      "location": {
        "city": "Islamabad",
        "area": "Faisal Masjid",
        "district": "Islamabad",
        "street": "Faisal Avenue",
        "house_number": "1",
        "geo_position": {
          "latitude": 33.7294,
          "longitude": 73.0373
        }
      },
      "status": "active",
      "version": 2,
      "create_time": "2025-03-11T15:59:44.628974+05:00",
      "autorestart": {
        "restart": 1,
        "attempt_count": 10,
        "delay": 60,
        "current_attempt": 0,
        "last_attempt_time": "2025-03-14T13:53:31.900997+05:00",
        "status": "enabled"
      },
      "event_handler": {
        "origin": "http://127.0.0.1:5000/",
        "api_version": 6,
        "bestshot_handler": {
          "handler_id": "b2871790-039c-4e2d-bb1b-7bebe1ebb7d9"
        },
        "frame_store": "http://127.0.0.1:5000/6/images",
        "authorization": {
          "account_id": "00000000-0000-4000-b000-000000000146"
        },
        "detection_handler": null
      },
      "policies": {
        "sending": {
          "time_period_of_searching": -1,
          "silent_period": 0,
          "type": "sec",
          "number_of_bestshots_to_send": 1,
          "send_only_full_set": true,
          "delete_track_after_sending": false
        }
      },
      "last_error": null,
      "video_info": null,
      "preview": null,
      "groups": []
    },
    {
      "stream_id": "65a60318-6db4-4511-813e-d797bb79874b",
      "account_id": "00000000-0000-4000-b000-000000000146",
      "name": "55-1005-Bari Imam Darbar-FR",
      "description": "",
      "data": {
        "type": "tcp",
        "reference": "rtsp://admin:admin123@10.0.4.185:554",
        "roi": {
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "mode": "abs"
        },
        "rotation": 0,
        "preferred_program_stream_frame_width": 800,
        "endless": true,
        "droi": {
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "mode": "abs"
        }
      },
      "location": {
        "city": null,
        "area": null,
        "district": null,
        "street": null,
        "house_number": null,
        "geo_position": null
      },
      "autorestart": {
        "restart": 1,
        "attempt_count": 10,
        "delay": 60,
        "current_attempt": 0,
        "last_attempt_time": "2025-03-14T13:53:31.900997+05:00",
        "status": "enabled"
      },
      "status": "pause",
      "version": 2,
      "create_time": "2025-03-11T15:59:44.628974+05:00",
      "event_handler": {
        "origin": "http://127.0.0.1:5000/",
        "api_version": 6,
        "bestshot_handler": {
          "handler_id": "b2871790-039c-4e2d-bb1b-7bebe1ebb7d9"
        },
        "frame_store": "http://127.0.0.1:5000/6/images",
        "authorization": {
          "account_id": "00000000-0000-4000-b000-000000000146"
        },
        "detection_handler": null
      },
      "policies": {
        "sending": {
          "time_period_of_searching": -1,
          "silent_period": 0,
          "type": "sec",
          "number_of_bestshots_to_send": 1,
          "send_only_full_set": true,
          "delete_track_after_sending": false
        },
        "primary_track_policy": {
          "use_primary_track_policy": false,
          "best_shot_min_size": 70,
          "best_shot_proper_size": 140
        },
        "liveness": {
          "use_mask_liveness_filtration": false,
          "use_flying_faces_liveness_filtration": false,
          "liveness_mode": 0,
          "number_of_liveness_checks": 0,
          "liveness_threshold": 0,
          "mask_backgrounds_count": 0,
          "use_shoulders_liveness_filtration": false,
          "livenesses_weights": [0, 0, 0]
        },
        "filtering": {
          "min_score": 0.5187,
          "detection_yaw_threshold": 40,
          "detection_pitch_threshold": 40,
          "detection_roll_threshold": 30,
          "yaw_number": 1,
          "yaw_collection_mode": false,
          "mouth_occlusion_threshold": 0,
          "min_body_size_threshold": 0
        },
        "frame_processing_mode": "auto",
        "real_time_mode_fps": 0,
        "ffmpeg_threads_number": 0,
        "healthcheck": {
          "max_error_count": 10,
          "period": 3600,
          "retry_delay": 5
        }
      },
      "last_error": null,
      "video_info": null,
      "preview": null,
      "groups": []
    }
  ]
};

export async function GET() {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return NextResponse.json(mockData);
}