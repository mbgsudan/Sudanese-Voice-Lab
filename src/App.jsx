import React from 'react';
import { motion } from 'framer-motion';
import HeroImage from './components/HeroImage';
import WelcomeMessage from './components/WelcomeMessage';
import CallToAction from './components/CallToAction';

function App() {
    return (
        <div className='min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden'>
            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className='text-center space-y-8'
            >
                <HeroImage />
                <WelcomeMessage />
                <CallToAction />
            </motion.div>
        </div>
    );
}

export default App;