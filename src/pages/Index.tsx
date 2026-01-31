import { Helmet } from 'react-helmet-async';
import SmartAdsSystem from '@/pages/SmartAdsSystem';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>SmartAds - AI-Powered Dynamic Advertising System</title>
        <meta name="description" content="Real-time demographic-based ad targeting using webcam detection. Dynamic ad queue prioritization based on audience gender and age." />
        <meta name="keywords" content="smart advertising, AI ads, demographic targeting, webcam detection, dynamic ads" />
      </Helmet>
      <SmartAdsSystem />
    </>
  );
};

export default Index;
