.PHONY: install train api web dev docker-build docker-run demo clean

install:
	pip install -r backend_api/requirements.txt
	pip install rich loguru pydantic fastapi uvicorn "tensorflow>=2.14" "opencv-python-headless" "pillow"
	cd frontend_web && npm install

train:
	python ml_pipeline/train.py --epochs 50 --batch-size 32 --log-dir ./logs

api:
	uvicorn backend_api.app.main:app --reload --host 0.0.0.0 --port 8000

web:
	cd frontend_web && npm run dev

dev:
	@echo "=========================================================="
	@echo "🧠 Bootstrapping NeuroMark Enterprise Environments..."
	@echo "API: http://localhost:8000 | Web: http://localhost:3000"
	@echo "Close this command with Ctrl+C to stop both."
	@echo "=========================================================="
	make api & make web & wait

docker-build:
	docker build -t neuromark-backend ./backend_api

docker-run:
	docker run -p 8000:8000 neuromark-backend

demo:
	python -m agent_cli.neuromark demo --input assets/sample.mp4 --output demo_final.mp4

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	rm -rf logs/ .pytest_cache/
