# app.py
import flask
import io
import base64
from PIL import Image

# --- Flask App Setup ---
app = flask.Flask(__name__, static_folder='static')
app.config['SECRET_KEY'] = 'super secret key'
 
# --- Image Processing Logic ---
def process_images_from_base64(contract_b64, signature_b64, position):
    """Takes base64 image data, processes it, and returns a base64 result."""
    
    # Decode base64 strings to bytes
    contract_data = base64.b64decode(contract_b64.split(',')[1])
    signature_data = base64.b64decode(signature_b64.split(',')[1])

    # Open images from bytes
    contract_img = Image.open(io.BytesIO(contract_data)).convert("RGBA")
    signature_img = Image.open(io.BytesIO(signature_data)).convert("RGBA")

    # 1. Upscale contract by 10%
    w, h = contract_img.size
    upscaled_contract = contract_img.resize((int(w * 1.1), int(h * 1.1)), Image.Resampling.LANCZOS)

    # 2. Paste signature at the calculated position
    upscaled_contract.paste(signature_img, position, signature_img)

    # 3. Save result back to bytes and encode to base64
    buffered = io.BytesIO()
    upscaled_contract.save(buffered, format="PNG")
    final_image_b64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

    return f"data:image/png;base64,{final_image_b64}"


# --- API Endpoints ---
@app.route('/')
def home():
    """Renders the main HTML page."""
    return flask.render_template('index.html')

@app.route('/process', methods=['POST'])
def process_image_endpoint():
    """Receives image data, processes it with hardcoded coordinates, and returns the result."""
    data = flask.request.json
    try:
        contract_b64 = data['contract']
        signature_b64 = data['signature']
        # These are the hardcoded coordinates from the frontend
        placement_x = data['x']
        placement_y = data['y']
        
        # The contract is upscaled by 1.1, so the coordinates must be scaled too.
        # This new position is for the top-left corner of the signature.
        scale_factor = 1.1
        final_paste_x = int(placement_x * scale_factor)
        final_paste_y = int(placement_y * scale_factor)

        result_b64 = process_images_from_base64(contract_b64, signature_b64, (final_paste_x, final_paste_y))
        
        return flask.jsonify({'status': 'success', 'image': result_b64})
 
    except Exception as e:
        print(f"An error occurred: {e}")
        return flask.jsonify({'status': 'error', 'message': str(e)})


# --- Entry Point ---
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8080, debug=True) 