import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Generator from '@/components/Generator'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="relative z-10">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-12 lg:py-20">
        <Hero />
        <Generator />
      </div>
      <Footer />
    </main>
  )
}
