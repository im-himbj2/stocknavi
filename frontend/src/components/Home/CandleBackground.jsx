import { useEffect, useRef } from 'react'

const CandleBackground = () => {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        const resizeCanvas = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)

        // 캔들스틱 데이터 생성
        class Candle {
            constructor(x, y, width) {
                this.x = x
                this.y = y
                this.width = width
                this.height = Math.random() * 60 + 20
                this.bodyHeight = Math.random() * this.height * 0.7
                this.isGreen = Math.random() > 0.5
                this.opacity = Math.random() * 0.15 + 0.05
                this.speed = Math.random() * 0.3 + 0.2
            }

            update() {
                this.y -= this.speed
                // 화면 위로 벗어나면 아래에서 다시 시작
                if (this.y + this.height < 0) {
                    this.y = canvas.height + Math.random() * 200
                    this.height = Math.random() * 60 + 20
                    this.bodyHeight = Math.random() * this.height * 0.7
                    this.isGreen = Math.random() > 0.5
                    this.opacity = Math.random() * 0.15 + 0.05
                }
            }

            draw() {
                const wickX = this.x + this.width / 2
                const bodyTop = this.y + (this.height - this.bodyHeight) / 2

                // 심지 (Wick)
                ctx.strokeStyle = this.isGreen
                    ? `rgba(34, 197, 94, ${this.opacity * 0.8})`
                    : `rgba(239, 68, 68, ${this.opacity * 0.8})`
                ctx.lineWidth = 1.5
                ctx.beginPath()
                ctx.moveTo(wickX, this.y)
                ctx.lineTo(wickX, this.y + this.height)
                ctx.stroke()

                // 몸통 (Body)
                ctx.fillStyle = this.isGreen
                    ? `rgba(34, 197, 94, ${this.opacity})`
                    : `rgba(239, 68, 68, ${this.opacity})`
                ctx.fillRect(this.x, bodyTop, this.width, this.bodyHeight)

                // 테두리 (선택적)
                ctx.strokeStyle = this.isGreen
                    ? `rgba(34, 197, 94, ${this.opacity * 1.5})`
                    : `rgba(239, 68, 68, ${this.opacity * 1.5})`
                ctx.lineWidth = 1
                ctx.strokeRect(this.x, bodyTop, this.width, this.bodyHeight)
            }
        }

        // 캔들 배열 생성 (화면 너비에 따라 개수 조정)
        const candleWidth = 12
        const candleGap = 25
        const numCandles = Math.ceil(canvas.width / (candleWidth + candleGap)) + 2
        const candles = []

        for (let i = 0; i < numCandles; i++) {
            const x = i * (candleWidth + candleGap)
            const y = Math.random() * canvas.height
            candles.push(new Candle(x, y, candleWidth))
        }

        // 애니메이션 루프
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            candles.forEach(candle => {
                candle.update()
                candle.draw()
            })

            requestAnimationFrame(animate)
        }

        animate()

        return () => {
            window.removeEventListener('resize', resizeCanvas)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
        />
    )
}

export default CandleBackground
