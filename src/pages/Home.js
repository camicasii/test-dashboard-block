import React from 'react';
import { create } from 'ipfs-http-client';
import Header from '../containers/Header';
import HeroHome from '../containers/HeroHome';
import Footer from '../containers/Footer';


function Home() {
  

  async function name() {
    const client = create('http://ipfs-api.readl.co')  
    const { cid } = await client.add(JSON.stringify(Math.random()*100000));
    console.log(cid);
  }
  return (
    <div className="flex flex-col min-h-screen overflow-hidden">

      {/*  Site header */}
      <Header />
      <HeroHome />
      <Footer /> 

      {/*  Site footer */}
   

    </div>
  );
}

export default Home;
