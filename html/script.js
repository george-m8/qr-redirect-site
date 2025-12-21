const form = document.getElementById('qr-form')
    const destinationInput = document.getElementById('destination')
    const slugInput = document.getElementById('slug')
    const output = document.getElementById('output')
    const redirectUrlEl = document.getElementById('redirect-url')
    const redirectUrlLink = redirectUrlEl.parentElement
    const canvas = document.getElementById('qr-canvas')
    const downloadBtn = document.getElementById('download')
    const destinationUrlEl = document.getElementById('destination-url')
    const destinationUrlLink = destinationUrlEl.parentElement
    const baseUrl = getBaseUrl()
    let currentDestination = ''

    function getBaseUrl() {
        if (window.location.protocol === 'file:') {
            // local dev fallback
            return 'https://example.com'
        }
        return `${window.location.protocol}//${window.location.host}`
    }

    function normaliseDestination(input) {
        let value = input.trim()

        if (!value) return null

        // If protocol is missing, default to https
        if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) {
            value = 'https://' + value
        }

        try {
            const url = new URL(value)

            // Optional: block non-http(s) schemes
            if (!['http:', 'https:'].includes(url.protocol)) {
            return null
            }

            return url.toString()
        } catch {
            return null
        }
    }

    function generateSlug() {
      return Math.random().toString(36).substring(2, 8)
    }

    function sanitizeForFilename(url) {
      try {
        const urlObj = new URL(url)
        return urlObj.hostname.replace(/\./g, '-') + urlObj.pathname.replace(/\//g, '-').replace(/^-+|-+$/g, '')
      } catch {
        return url.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
      }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault()

        const slug = slugInput.value.trim() || generateSlug()
        const rawDestination = destinationInput.value
        const destination = normaliseDestination(rawDestination)

        if (!destination) {
            alert('Please enter a valid URL')
            return
        }
        
        const redirectUrl = `${baseUrl}/r/${slug}`

        currentDestination = destination
        redirectUrlEl.textContent = redirectUrl
        redirectUrlLink.href = redirectUrl
        destinationUrlEl.textContent = destination
        destinationUrlLink.href = destination
        output.style.display = 'block'

        const hostnameStr = sanitizeForFilename(baseUrl)
        const destinationStr = sanitizeForFilename(currentDestination)
        const title = `${hostnameStr}_${destinationStr}`
        canvas.title = title

        await QRCode.toCanvas(canvas, redirectUrl, {
            width: 256,
            margin: 2
        })
    })

    downloadBtn.addEventListener('click', () => {
      const hostnameStr = sanitizeForFilename(baseUrl)
      const destinationStr = sanitizeForFilename(currentDestination)
      const filename = `${hostnameStr}_${destinationStr}.png`
      
      const link = document.createElement('a')
      link.download = filename
      link.href = canvas.toDataURL('image/png')
      link.click()
    })