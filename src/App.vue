<template>
  <div id="app-container">
    <Navbar />
    <DashboardGrid class="dashboard-container">
      <div class="grid-stack-item" gs-x="0" gs-y="0" gs-w="4" gs-h="8">
        <div class="grid-stack-item-content">
          <div class="widget-wrapper">
            <TimingTableWidget />
          </div>
        </div>
      </div>
      
      <div class="grid-stack-item" gs-x="4" gs-y="0" gs-w="6" gs-h="5">
         <div class="grid-stack-item-content">
           <div class="widget-wrapper">
            <F1StatusDisplay />
           </div>
        </div>
      </div>

      <div class="grid-stack-item" gs-x="10" gs-y="0" gs-w="1" gs-h="1">
        <div class="grid-stack-item-content">
           <div class="widget-wrapper">
            <TrackStatusLEDWidget />
           </div>
        </div>
      </div>

    </DashboardGrid>
  </div>
</template>

<script>
import F1StatusDisplay from '@/components/widgets/F1StatusDisplay.vue';
import TrackStatusLEDWidget from './components/widgets/TrackStatusLEDWidget.vue';
import TimingTableWidget from '@/components/widgets/TimingTableWidget.vue';
import DashboardGrid from './components/DashboardGrid.vue';
import Navbar from './components/Navbar.vue';

export default {
  components: {
    Navbar,
    DashboardGrid,
    F1StatusDisplay,
    TimingTableWidget,
    TrackStatusLEDWidget
  }
}
</script>

<style>

*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  font-family: sans-serif; 
}

#app-container {
  display:flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden; 
}

#app-container > h1 {
  flex-shrink: 0; 
  margin: 10px 20px;
}

.dashboard-container {
  flex-grow: 1; /* Allow dashboard to take remaining space */
  margin: 0 20px 20px 20px;
  overflow: auto;
  min-width: 0; 
}

.grid-stack-item-content {
  background-color: #f8f9fa; 
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: auto !important; 
  color: #212529;
  display: flex; 
  flex-direction: column; 
}

.widget-wrapper {
  padding: 10px;
  flex-grow: 1; 
  display: flex;
  flex-direction: column;
  overflow: auto; 
}

.widget-wrapper h2 {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 1.1rem;
    border-bottom: 1px solid #ccc;
    padding-bottom: 5px;
}

.p-button {
    margin-right: 5px;
}
</style>