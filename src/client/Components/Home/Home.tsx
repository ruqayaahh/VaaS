import React, { SetStateAction, useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../Store/hooks';
import { storeClusterDbData } from '../../Store/actions';
import { clusterMetric, nodeMetric } from "../../Queries";
import { storeClusterQueryData } from "../../Store/actions";
import NavBar from './NavBar';
import Kube from '../Cards/Kube';
import { Get } from '../../Services';
import { apiRoute } from '../../utils';
import { IReducers } from '../../Interfaces/IReducers';
import { IClusterMetrics } from "../../Interfaces/IAction";
import './styles.css';
import { ClusterTypes } from '../../Interfaces/ICluster';
import { ThemeProvider } from '@emotion/react';
import { dark } from '../ITheme';
import { Button } from '@mui/material';
const Home = () => {
  const dispatch = useAppDispatch();
  const clusterReducer = useAppSelector((state: IReducers) => state.clusterReducer);
  const uiReducer = useAppSelector((state: IReducers) => state.uiReducer);
  const apiReducer = useAppSelector((state: IReducers) => state.apiReducer);
  const [noClusterError, setNoClusterError] = useState('');
  const [clustersArray, setClustersArray] = useState([]);
  const darkMode = uiReducer.clusterUIState.darkmode;
  useEffect(() => {
    const getClusterDbData = async () => {
      // returns an array of cluster object
      const res = await Get(
        apiRoute.getRoute('cluster'),
        {
          authorization: localStorage.getItem('token')
        }
      );

      const user = await Get(
        // get user settings info
        apiRoute.getRoute(`user:${localStorage.getItem('username')}`),
        {
          authorization: localStorage.getItem('token')
        }
      );

      if (res.message) {
        setNoClusterError('Please add cluster information in administrator portal');
      } else {
        dispatch(storeClusterDbData(res));
        console.log(res);
        setClustersArray(res);
      }
      // regrab cluster data as refresh rate 
      setTimeout(() => getClusterDbData(), user.refreshRate);
    };

    if (apiReducer.initialLoad || (apiReducer.lastFetch + 3000 < new Date().getTime())) {
      console.log(apiReducer.initialLoad);
      getClusterDbData();
    }
  }, [clusterReducer.render]);

  useEffect(() => {
    const getClusterDbData = async () => {
      const res = await Get(
        apiRoute.getRoute('cluster'),
        {
          authorization: localStorage.getItem('token')
        }
      );
      if (res.message) {
        setNoClusterError('Please add cluster information in administrator portal');
      } else {
        dispatch(storeClusterDbData(res));
        setClustersArray(res);
      }
    };
    getClusterDbData();
  }, [clusterReducer.favRender]);


  useEffect(() => {
    // grabbing metrics from each cluster object in array and sending each of them to state/store
    clustersArray.forEach(async (element: ClusterTypes) => {
      const metrics: IClusterMetrics = {
        allNodes: '',
        cpuLoad: 0,
        memoryLoad: 0,
        totalDeployments: '',
        totalPods: '',
        allNamespaces: '',
        allServices: '',
        allNameList: ''
      };

      const fetchNodes = async () => {
        const res = await clusterMetric.allNodes(element._id, "k8");
        if (res) metrics.allNodes = res;
      };
      await fetchNodes();
      const fetchCpuUsage = async () => {
        const res = await nodeMetric.cpuLoad(element._id, "k8");
        if (res) metrics.cpuLoad = res;
      };
      await fetchCpuUsage();
      const fetchMemoryUsage = async () => {
        const res = await clusterMetric.memoryLoad(element._id, "k8");
        if (res) metrics.memoryLoad = Number((res / 1000000).toFixed(1));
      };
      await fetchMemoryUsage();
      const fetchTotalDeployments = async () => {
        const res = await clusterMetric.totalDeployments(element._id, "k8");
        if (res) metrics.totalDeployments = res;
      };
      await fetchTotalDeployments();
      const fetchTotalPods = async () => {
        const res = await clusterMetric.totalPods(element._id, "k8");
        if (res) metrics.totalPods = res;
      };
      await fetchTotalPods();
      const fetchNamespaces = async () => {
        const res = await clusterMetric.allNamespaces(element._id, "k8");
        if (res) metrics.allNamespaces = res;
      };
      await fetchNamespaces();
      const fetchServices = async () => {
        const res = await clusterMetric.allServices(element._id, "k8");
        if (res) metrics.allServices = res;
      };
      await fetchServices();

      dispatch(storeClusterQueryData(element._id, metrics));
    });
  }, [clustersArray]);

  const favClusters: JSX.Element[] = [];
  const nonFavClusters: JSX.Element[] = [];

  apiReducer.clusterDbData.forEach((element, idx) => {
    if (element.favorite?.includes(localStorage.getItem('userId') as string)) {
      favClusters.push(<Kube
        key={'fav' + idx}
        _id={element._id}
        favorite={element.favorite}
        favoriteStatus={true}
      />);
    } else {
      nonFavClusters.push(<Kube
        key={'nonFav' + idx}
        _id={element._id}
        favorite={element.favorite}
        favoriteStatus={false}
      />);
    }
  });

  return (
    <div className="Kube-port">
      {
        darkMode &&
        <ThemeProvider theme={dark}>
          <div background-color="background">
            <h1>DarkMODE ON</h1>
            <Button variant="contained"
              className="btn"
              type="button" background-color="primary">
              Hi
            </Button>
          </div>
        </ThemeProvider>
      }
      <div className="Kube-container">
        {favClusters}
        {nonFavClusters}
      </div>
      {noClusterError}
      <NavBar />
    </div>
  );
};

export default Home;